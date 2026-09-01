import assert from "node:assert/strict";
import test from "node:test";
import { cleanRoomTemporaryBase } from "../lib/clean-room-path.mjs";

test("uses the system temporary directory outside Windows", () => {
  assert.equal(cleanRoomTemporaryBase({
    sourceRoot: "/workspace/keel",
    systemTemp: "/tmp",
    runnerTemp: "/runner-temp",
    platform: "darwin",
  }), "/tmp");
});

test("keeps a Windows clean-room clone on the checkout drive", () => {
  assert.equal(cleanRoomTemporaryBase({
    sourceRoot: "D:\\a\\expense-management-software\\expense-management-software",
    systemTemp: "C:\\Users\\runner\\AppData\\Local\\Temp",
    runnerTemp: "D:\\a\\_temp",
    platform: "win32",
  }), "D:\\a\\_temp");
});

test("falls back to the Windows checkout parent when runner temp is cross-drive", () => {
  assert.equal(cleanRoomTemporaryBase({
    sourceRoot: "D:\\work\\keel",
    systemTemp: "C:\\Temp",
    runnerTemp: "C:\\runner-temp",
    platform: "win32",
  }), "D:\\work");
});
