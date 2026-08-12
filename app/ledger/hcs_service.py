from __future__ import annotations

import json
import logging

from hiero_sdk_python import (
    AccountId,
    Client,
    Network,
    PrivateKey,
    TopicCreateTransaction,
    TopicMessageSubmitTransaction,
)

from app.config import Settings
from app.ledger.base import AnchorReceipt, LedgerService

logger = logging.getLogger(__name__)


def build_client(settings: Settings) -> Client:
    if not settings.HEDERA_OPERATOR_ID or not settings.HEDERA_OPERATOR_KEY:
        raise RuntimeError(
            "HEDERA_OPERATOR_ID / HEDERA_OPERATOR_KEY are required when "
            "LEDGER_SIMULATE=False. Get free testnet credentials at "
            "https://portal.hedera.com and put them in your .env"
        )
    network = Network(network=settings.HEDERA_NETWORK)
    client = Client(network)
    client.set_operator(
        AccountId.from_string(settings.HEDERA_OPERATOR_ID),
        PrivateKey.from_string(settings.HEDERA_OPERATOR_KEY),
    )
    return client


class HcsLedgerService(LedgerService):
    """Real HCS-backed audit trail. Access-control decisions still live in
    the app DB (see app/services/access_service.py) — this mode never
    touches HSCS (no contract, no gas for access logic)."""

    def __init__(self, settings: Settings, client: Client | None = None):
        self.settings = settings
        self.client = client or build_client(settings)
        self.topic_id = settings.HEDERA_RECORD_TOPIC_ID
        if not self.topic_id:
            self.topic_id = self._create_topic()
            logger.warning(
                "Created new HCS topic %s — save this to HEDERA_RECORD_TOPIC_ID "
                "in your .env so a new topic isn't created on every restart.",
                self.topic_id,
            )

    @property
    def enforces_access_onchain(self) -> bool:
        return False

    def _create_topic(self) -> str:
        receipt = (
            TopicCreateTransaction(memo="MedChain audit trail")
            .freeze_with(self.client)
            .execute(self.client)
        )
        return str(receipt.topic_id)

    def record_event(self, *, resource_type, resource_id, action, payload_hash) -> AnchorReceipt:
        message = json.dumps(
            {
                "resource_type": resource_type,
                "resource_id": resource_id,
                "action": action,
                "payload_hash": payload_hash,
            },
            sort_keys=True,
        )
        tx = TopicMessageSubmitTransaction(topic_id=self.topic_id, message=message)
        result = tx.freeze_with(self.client).execute(self.client)
        # execute() returns a TransactionReceipt-like object depending on SDK version;
        # topic_sequence_number / consensus_timestamp are populated by the network.
        return AnchorReceipt(
            transaction_id=str(getattr(result, "transaction_id", "")),
            topic_id=str(self.topic_id),
            sequence_number=getattr(result, "topic_sequence_number", None),
            consensus_timestamp=str(getattr(result, "consensus_timestamp", "")) or None,
            simulated=False,
        )
