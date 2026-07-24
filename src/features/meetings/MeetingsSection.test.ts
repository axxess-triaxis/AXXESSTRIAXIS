import { describe, expect, it } from "vitest";
import { invalidAttendeeIds } from "./MeetingsSection";

// Sprint 2 (Live Golden Path Execution): the HITL's live walkthrough typed prose ("Tenant 0 dummy
// data") into the free-text "Participants" field and got "Meeting could not be saved. Check
// permissions and required fields." -- traced to attendee_ids being a genuine uuid[] column
// (supabase/migrations/20260703083915_sprint7_crud_workflows.sql) with no client-side validation
// catching non-UUID entries before the doomed request round-tripped to a database type-cast error.
describe("invalidAttendeeIds (meeting participants validation, Sprint 2)", () => {
  it("flags free-text entries that are not valid UUIDs", () => {
    expect(invalidAttendeeIds("Tenant 0 dummy data")).toEqual(["Tenant 0 dummy data"]);
  });

  it("accepts real UUIDs, comma- or newline-separated", () => {
    const a = "11111111-1111-1111-1111-111111111111";
    const b = "22222222-2222-2222-2222-222222222222";
    expect(invalidAttendeeIds(`${a}, ${b}`)).toEqual([]);
    expect(invalidAttendeeIds(`${a}\n${b}`)).toEqual([]);
  });

  it("treats an empty field as valid (no participants is allowed)", () => {
    expect(invalidAttendeeIds("")).toEqual([]);
    expect(invalidAttendeeIds("   ")).toEqual([]);
  });

  it("flags a mix of valid and invalid entries, reporting only the invalid ones", () => {
    const valid = "11111111-1111-1111-1111-111111111111";
    expect(invalidAttendeeIds(`${valid}, district lead`)).toEqual(["district lead"]);
  });
});
