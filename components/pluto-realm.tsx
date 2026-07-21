"use client";

import Image from "next/image";
import type { ProgramPage, ProgramState } from "@/features/program/state";

type PlutoRealmProps = {
  program: ProgramState;
  go: (page: ProgramPage) => void;
};

function Mark({ compact = false }: { compact?: boolean }) {
  return <span className={`realm-mark ${compact ? "compact" : ""}`} aria-hidden="true"><i /><b /><em /></span>;
}

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

export function PlutoRealm({ program, go }: PlutoRealmProps) {
  const subjects = program.mission.subjectLinks.slice(0, 3).map((item) => item.subject);

  return <main className="pluto-realm">
    <header className="marketing-nav">
      <button className="marketing-brand" onClick={() => go("landing")} aria-label="Pluto home"><Mark compact /><span>PLUTO</span></button>
      <nav aria-label="Explore Pluto">
        <button onClick={() => go("partner_intake")}>For communities</button>
        <button onClick={() => go("teacher_dashboard")}>For schools</button>
        <button onClick={() => go("proof")}>Proof</button>
      </nav>
      <button className="marketing-cta" onClick={() => go("partner_intake")}>Start a mission <Arrow /></button>
    </header>

    <section className="marketing-hero">
      <div className="marketing-hero-copy">
        <p className="marketing-eyebrow"><i /> LEARNING IN THE REAL WORLD</p>
        <h1>Make school<br />matter <em>out there.</em></h1>
        <p>Pluto turns a community need into a teacher-reviewed mission where students research, make, test, and leave useful work behind.</p>
        <div className="marketing-actions">
          <button className="marketing-primary" onClick={() => go("partner_intake")}>Build a mission <Arrow /></button>
          <button className="marketing-link" onClick={() => go("student_mission")}>Explore a live mission <Arrow /></button>
        </div>
        <div className="marketing-proofline"><span>●</span><b>Teacher-approved · Community-connected</b></div>
      </div>
      <div className="marketing-hero-scene" aria-hidden="true">
        <Image src="/images/pluto-learning-community-hero.png" alt="" fill priority sizes="(max-width: 760px) 100vw, 56vw" />
      </div>
    </section>

    <section className="marketing-feature marketing-feature-brief">
      <div className="marketing-feature-copy">
        <p className="marketing-eyebrow"><i /> START WITH WHAT IS REAL</p>
        <h2>Turn one local problem into a mission people can understand.</h2>
        <p>Share the need. Pluto shapes the question, roles, plan, safeguards, and evidence path. The teacher makes the final call.</p>
        <button className="marketing-link" onClick={() => go("partner_intake")}>See how a mission takes shape <Arrow /></button>
      </div>
      <div className="mission-preview" aria-label="Live Pluto mission preview">
        <div className="mission-preview-head"><span>LIVE FIELD MISSION</span><b>KOCHI / 07.26</b></div>
        <article>
          <small>THE QUESTION WE ARE CHASING</small>
          <strong>{program.mission.drivingQuestion}</strong>
          <span>{program.partner.organisation}</span>
        </article>
        <div className="mission-preview-steps">
          <section><span>RESEARCH</span><b>4 sources checked</b></section>
          <section><span>MAKE</span><b>Campaign draft</b></section>
          <section><span>TEST</span><b>Family feedback</b></section>
        </div>
        <footer><span>{subjects.join(" · ")}</span><button onClick={() => go("student_workspace")}>Open fieldbook <Arrow /></button></footer>
      </div>
    </section>

    <section className="marketing-feature marketing-feature-image">
      <div className="marketing-image"><Image src="/images/pluto-community-studio.png" alt="Students collaborating on a local community campaign" fill sizes="(max-width: 760px) 100vw, 56vw" priority /></div>
      <div className="marketing-feature-copy">
        <p className="marketing-eyebrow"><i /> PEOPLE, NOT PLACEHOLDERS</p>
        <h2>Learning is better when someone will use the outcome.</h2>
        <p>A community partner sets the need. A teacher holds the learning. Students make something they can stand behind.</p>
        <button className="marketing-link" onClick={() => go("partner_dashboard")}>Meet the partner view <Arrow /></button>
      </div>
    </section>

    <section className="marketing-feature marketing-feature-teacher">
      <div className="marketing-feature-copy">
        <p className="marketing-eyebrow"><i /> HOLD THE LEARNING WELL</p>
        <h2>A teacher sees the signal, not just the submission.</h2>
        <p>Review scope, safety, evidence, and team progress in one quiet place. Intervene when it helps—not after the work is over.</p>
        <button className="marketing-primary" onClick={() => go("teacher_dashboard")}>Open the teacher workspace <Arrow /></button>
      </div>
      <div className="teacher-preview" aria-hidden="true">
        <header><span>TEACHER ATTENTION</span><b>One team may need a check-in</b></header>
        <article><i>S</i><div><strong>Team Sundown</strong><span>Source log updated 18 min ago</span></div><em>On track</em></article>
        <article><i>R</i><div><strong>Team River</strong><span>No source added in 2 days</span></div><em className="needs">Needs support</em></article>
        <article><i>C</i><div><strong>Team Canopy</strong><span>Survey summary reviewed</span></div><em>On track</em></article>
      </div>
    </section>

    <section className="marketing-proof">
      <div>
        <p className="marketing-eyebrow"><i /> THE PLUTO PROOF</p>
        <h2>Work worth doing<br />should be easy to verify.</h2>
        <p>Every mission keeps the brief, learning evidence, teacher review, and community response together.</p>
        <button className="marketing-primary" onClick={() => go("proof")}>View a verified mission <Arrow /></button>
      </div>
      <div className="proof-preview"><span>VERIFIED MISSION</span><b>Waste-wise families</b><p>Evidence · Teacher review · Partner response</p><i>✓</i></div>
    </section>

    <section className="marketing-roles">
      <p className="marketing-eyebrow"><i /> FIND YOUR PLACE</p>
      <h2>One mission.<br />Three clear roles.</h2>
      <div>
        <button onClick={() => go("partner_dashboard")}><span>01</span><strong>Community partner</strong><p>Share what matters; see what changed.</p><Arrow /></button>
        <button onClick={() => go("teacher_dashboard")}><span>02</span><strong>Teacher guide</strong><p>Shape the learning; support the right moment.</p><Arrow /></button>
        <button onClick={() => go("student_mission")}><span>03</span><strong>Student maker</strong><p>Make a contribution your community can use.</p><Arrow /></button>
      </div>
    </section>

    <footer className="marketing-footer"><button className="marketing-brand" onClick={() => go("landing")}><Mark compact /><span>PLUTO</span></button><p>Learning in the real world.</p><button className="marketing-link" onClick={() => go("proof")}>Explore Pluto Proof <Arrow /></button></footer>
  </main>;
}
