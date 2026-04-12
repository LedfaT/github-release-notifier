import notifierService from "../../api/modules/notifier/notifier.service";
import mailClient from "../../api/modules/notifier/mail.client";
import notifierCache from "../../api/modules/notifier/notifier.cache";

jest.mock("../../api/modules/notifier/mail.client", () => ({
  __esModule: true,
  default: {
    sendEmail: jest.fn(),
  },
}));

jest.mock("../../api/modules/notifier/notifier.cache", () => ({
  __esModule: true,
  default: {
    addUndeliveredReleaseMessage: jest.fn(),
    listUndeliveredReleaseMessages: jest.fn(),
    removeUndeliveredReleaseMessage: jest.fn(),
  },
}));

describe("NotifierService", () => {
  const mailClientMock = mailClient as jest.Mocked<typeof mailClient>;
  const notifierCacheMock = notifierCache as jest.Mocked<typeof notifierCache>;

  beforeEach(() => {
    jest.clearAllMocks();
    notifierCacheMock.listUndeliveredReleaseMessages.mockResolvedValue([]);
    notifierCacheMock.removeUndeliveredReleaseMessage.mockResolvedValue(
      undefined,
    );
  });

  it("stores undelivered message in cache map when release email send fails", async () => {
    mailClientMock.sendEmail.mockRejectedValue(new Error("smtp unavailable"));

    await expect(
      notifierService.sendNewReleaseEmail({
        email: "user@example.com",
        repository: "owner/repo",
        tagName: "v1.2.3",
        releaseUrl: "https://github.com/owner/repo/releases/tag/v1.2.3",
      }),
    ).rejects.toThrow("smtp unavailable");

    expect(
      notifierCacheMock.addUndeliveredReleaseMessage,
    ).toHaveBeenCalledTimes(1);
    expect(notifierCacheMock.addUndeliveredReleaseMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        repository: "owner/repo",
        tagName: "v1.2.3",
        releaseUrl: "https://github.com/owner/repo/releases/tag/v1.2.3",
        errorMessage: "smtp unavailable",
      }),
    );
  });

  it("does not cache undelivered confirmation emails", async () => {
    mailClientMock.sendEmail.mockRejectedValue(new Error("smtp unavailable"));

    await expect(
      notifierService.sendConfirmationEmail({
        email: "user@example.com",
        repository: "owner/repo",
        confirmToken: "confirm-token",
        unsubscribeToken: "unsubscribe-token",
      }),
    ).rejects.toThrow("smtp unavailable");

    expect(
      notifierCacheMock.addUndeliveredReleaseMessage,
    ).not.toHaveBeenCalled();
  });

  it("retries undelivered release emails and removes delivered ones", async () => {
    notifierCacheMock.listUndeliveredReleaseMessages.mockResolvedValue([
      {
        id: "msg-1",
        email: "a@example.com",
        repository: "owner/repo",
        tagName: "v1.2.3",
        releaseUrl: "https://github.com/owner/repo/releases/tag/v1.2.3",
        subject: "release",
        errorMessage: "smtp unavailable",
        failedAt: "2026-04-11T08:00:00.000Z",
      },
    ]);
    mailClientMock.sendEmail.mockResolvedValue(undefined);

    await notifierService.flushUndeliveredReleaseEmails();

    expect(
      notifierCacheMock.listUndeliveredReleaseMessages,
    ).toHaveBeenCalledTimes(1);
    expect(mailClientMock.sendEmail).toHaveBeenCalledTimes(1);
    expect(
      notifierCacheMock.removeUndeliveredReleaseMessage,
    ).toHaveBeenCalledWith("msg-1");
    expect(
      notifierCacheMock.addUndeliveredReleaseMessage,
    ).not.toHaveBeenCalled();
  });
});
