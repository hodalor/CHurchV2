const crypto = require("crypto");
const QRCode = require("qrcode");
const Member = require("../models/Member");
const { isStorageConfigured, uploadBufferToGoogleStorage } = require("./mediaStorageService");

function createQrToken() {
  return `mqr_${crypto.randomBytes(24).toString("base64url")}`;
}

async function generateUniqueQrToken() {
  let nextToken = createQrToken();

  while (await Member.exists({ qrToken: nextToken })) {
    nextToken = createQrToken();
  }

  return nextToken;
}

async function createQrImage(token, member) {
  const qrPayload = JSON.stringify({
    type: "member_checkin",
    token,
  });
  const svg = await QRCode.toString(qrPayload, {
    type: "svg",
    margin: 1,
    width: 480,
    color: {
      dark: "#102040",
      light: "#ffffff",
    },
  });
  const buffer = Buffer.from(svg, "utf8");

  if (isStorageConfigured()) {
    const uploaded = await uploadBufferToGoogleStorage({
      buffer,
      originalName: `${member.memberId || "member"}-qr.svg`,
      mimeType: "image/svg+xml",
      folder: "members/qr-codes",
    });

    return uploaded.url;
  }

  return `data:image/svg+xml;base64,${buffer.toString("base64")}`;
}

async function assignMemberQr(member, user = null, forceRegenerate = false) {
  if (!member) {
    throw new Error("Member record is required.");
  }

  if (!forceRegenerate && member.qrToken && member.qrCodeImageUrl) {
    return member;
  }

  const token = await generateUniqueQrToken();
  const qrCodeImageUrl = await createQrImage(token, member);
  const now = new Date();

  member.qrToken = token;
  member.qrCodeImageUrl = qrCodeImageUrl;
  member.qrActive = true;

  if (!member.qrGeneratedAt) {
    member.qrGeneratedAt = now;
  } else {
    member.qrRegeneratedAt = now;
    member.qrRegeneratedBy = user?._id || null;
  }

  await member.save();
  return member;
}

async function findMemberByQrToken(qrToken) {
  const resolvedToken = extractQrToken(qrToken);

  if (!resolvedToken) {
    throw new Error("QR token is required.");
  }

  const member = await Member.findOne({
    qrToken: resolvedToken,
    qrActive: true,
  }).populate("ministry", "name color");

  if (!member) {
    throw new Error("QR token is invalid or inactive.");
  }

  return member;
}

function extractQrToken(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    return "";
  }

  if (value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value);
      return String(parsed.token || "").trim();
    } catch (error) {
      return value;
    }
  }

  return value;
}

async function regenerateMemberQr(member, user = null) {
  if (!member) {
    throw new Error("Member record is required.");
  }

  member.qrActive = false;
  await member.save();
  return assignMemberQr(member, user, true);
}

async function migrateMemberQRCodes({ limit = 0, user = null } = {}) {
  const query = {
    $or: [{ qrToken: { $exists: false } }, { qrToken: "" }, { qrCodeImageUrl: { $exists: false } }, { qrCodeImageUrl: "" }],
  };
  const members = await Member.find(query).sort({ createdAt: 1 }).limit(Number(limit) > 0 ? Number(limit) : 0);
  let updatedCount = 0;

  for (const member of members) {
    await assignMemberQr(member, user, true);
    updatedCount += 1;
  }

  return {
    updatedCount,
    scannedCount: members.length,
  };
}

module.exports = {
  assignMemberQr,
  findMemberByQrToken,
  migrateMemberQRCodes,
  regenerateMemberQr,
};
