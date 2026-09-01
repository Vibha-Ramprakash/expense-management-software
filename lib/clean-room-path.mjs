import { win32 } from "node:path";

export function cleanRoomTemporaryBase({ sourceRoot, systemTemp, runnerTemp, platform = process.platform }) {
  if (platform !== "win32") return systemTemp;

  const sourceDrive = win32.parse(sourceRoot).root.toLowerCase();
  const sameDriveCandidates = [runnerTemp, win32.dirname(sourceRoot), systemTemp].filter(Boolean);
  return sameDriveCandidates.find((candidate) => win32.parse(candidate).root.toLowerCase() === sourceDrive)
    ?? win32.dirname(sourceRoot);
}
