import {
  getSessionItem,
  removeSessionItem,
  setSessionItem,
} from "@/lib/storage/safeSessionStorage";

describe("safeSessionStorage", () => {
  const key = "safe-session-storage-denied-test";

  afterEach(() => {
    jest.restoreAllMocks();
    removeSessionItem(key);
  });

  it("uses its in-memory fallback when browser storage access is denied", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Access is denied", "SecurityError");
    });
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Access is denied", "SecurityError");
    });
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Access is denied", "SecurityError");
    });

    setSessionItem(key, "cached package");
    expect(getSessionItem(key)).toBe("cached package");

    removeSessionItem(key);
    expect(getSessionItem(key)).toBeNull();
  });
});
