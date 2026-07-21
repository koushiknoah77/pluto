import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

test("relational foundation migration creates school-scoped entities", () => {
  const database = new DatabaseSync(":memory:");
  const sql = readFileSync(new URL("../db/migrations/001_relational_foundation.sql", import.meta.url), "utf8");
  database.exec(sql);
  const names = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
  for (const table of ["schools", "organisations", "users", "classes", "missions", "students", "enrollments", "assignment_history", "student_assessments", "proof_snapshots", "files", "consents", "audits", "activity_events"]) {
    assert.ok(names.includes(table), `${table} table is present`);
  }
  const userColumns = database.prepare("PRAGMA table_info(users)").all().map((row) => row.name);
  const studentColumns = database.prepare("PRAGMA table_info(students)").all().map((row) => row.name);
  assert.ok(userColumns.includes("organisation_id"));
  assert.ok(userColumns.includes("student_id"));
  assert.ok(studentColumns.includes("status"));
  assert.ok(studentColumns.includes("payload_json"));
  database.close();
});
