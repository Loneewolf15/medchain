"""
Run this ONCE per Hedera account/network to set up the on-chain pieces
MedChain needs, then paste the printed IDs into your .env.

Usage:
    python scripts/bootstrap_hedera.py            # HCS topic only
    python scripts/bootstrap_hedera.py --contract # HCS topic + AccessControl.sol

Requires HEDERA_OPERATOR_ID / HEDERA_OPERATOR_KEY in your .env (free
testnet credentials: https://portal.hedera.com). Also requires internet
access to binaries.soliditylang.org the first time --contract compiles
the contract (py-solc-x downloads the solc compiler binary once and
caches it locally).
"""
from __future__ import annotations

import argparse
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from app.config import get_settings  # noqa: E402
from app.ledger.hcs_service import build_client  # noqa: E402


def create_topic(client) -> str:
    from hiero_sdk_python import TopicCreateTransaction

    receipt = (
        TopicCreateTransaction(memo="MedChain audit trail")
        .freeze_with(client)
        .execute(client)
    )
    return str(receipt.topic_id)


def compile_contract() -> tuple[bytes, list[dict]]:
    import solcx

    contract_path = pathlib.Path(__file__).resolve().parent.parent / "contracts" / "AccessControl.sol"
    solcx.install_solc("0.8.19")
    compiled = solcx.compile_files(
        [str(contract_path)],
        output_values=["abi", "bin"],
        solc_version="0.8.19",
    )
    key = f"{contract_path}:AccessControl"
    bytecode = bytes.fromhex(compiled[key]["bin"])
    abi = compiled[key]["abi"]
    return bytecode, abi


def deploy_contract(client, bytecode: bytes) -> str:
    from hiero_sdk_python import ContractCreateTransaction, FileCreateTransaction

    # Bytecode goes into a Hedera File first, then the contract is created
    # pointing at that file (standard HSCS deployment pattern).
    file_receipt = (
        FileCreateTransaction()
        .set_keys([client.operator.public_key])
        .set_contents(bytecode)
        .freeze_with(client)
        .execute(client)
    )
    file_id = file_receipt.file_id

    contract_receipt = (
        ContractCreateTransaction()
        .set_bytecode_file_id(file_id)
        .set_gas(500_000)
        .set_contract_memo("MedChain AccessControl")
        .freeze_with(client)
        .execute(client)
    )
    return str(contract_receipt.contract_id)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--contract", action="store_true", help="also compile+deploy AccessControl.sol")
    args = parser.parse_args()

    settings = get_settings()
    if settings.LEDGER_SIMULATE:
        print(
            "LEDGER_SIMULATE=true in your .env — this script talks to real "
            "Hedera testnet, so set LEDGER_SIMULATE=false (and fill in "
            "HEDERA_OPERATOR_ID / HEDERA_OPERATOR_KEY) before running it."
        )
        sys.exit(1)

    client = build_client(settings)

    print("Creating HCS topic...")
    topic_id = create_topic(client)
    print(f"  HEDERA_RECORD_TOPIC_ID={topic_id}")

    if args.contract:
        print("Compiling contracts/AccessControl.sol...")
        bytecode, _abi = compile_contract()
        print("Deploying AccessControl contract...")
        contract_id = deploy_contract(client, bytecode)
        print(f"  HEDERA_ACCESS_CONTRACT_ID={contract_id}")

    print("\nAdd the line(s) above to your .env, then set LEDGER_MODE accordingly.")


if __name__ == "__main__":
    main()
