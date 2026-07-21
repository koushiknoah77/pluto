"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BadgeCheck, CircleAlert, ShieldCheck } from "lucide-react";

type Verification = { id: string; verified: boolean; mission: string | null; school: string | null; issuedAt: string | null };

export default function PublicProofPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [proof, setProof] = useState<Verification | null>(null);
  useEffect(() => {
    if (!id) return;
    let active = true;
    void fetch(`/api/platform/proof/verify/${encodeURIComponent(id)}`)
      .then((response) => response.json() as Promise<Verification>)
      .then((payload) => { if (active) setProof(payload); })
      .catch(() => { if (active) setProof({ id, verified: false, mission: null, school: null, issuedAt: null }); });
    return () => { active = false; };
  }, [id]);
  if (!proof) return <main className="public-proof-status">Checking this Pluto Proof…</main>;
  if (!proof.verified) return <main className="public-proof-status invalid"><CircleAlert /><h1>This Proof cannot be verified.</h1><p>It may be private, pending validation, or have an invalid verification code.</p></main>;
  return <main className="public-proof-status"><BadgeCheck /><p>VERIFIED PLUTO PROOF</p><h1>{proof.mission}</h1><span>{proof.school} · Issued {proof.issuedAt}</span><div><ShieldCheck />Teacher-assessed and partner-validated community learning record.</div></main>;
}
