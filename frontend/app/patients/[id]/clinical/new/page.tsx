"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClinicalRecord } from "@/lib/api";
import Spinner from "@/components/Spinner";

export default function NewClinicalPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    record_type: "vitals",
    source: "device",
    data: "{}"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // NOT IMPLEMENTED FULLY YET, THIS FILE IS JUST FOR SHOWING WE CAN ROUTE TO A NEW PAGE IF NEEDED.
  // Wait, the user asked for: "proceed to the new clinical page, the records should be 4 in the horizontal on desktop and should be mobile responsive."
  // This means a page to VIEW ALL records, not necessarily to create one, although the prompt says "proceed to the new clinical page".
  // Actually, they mean a dedicated page to VIEW clinicals. 
  return null;
}
