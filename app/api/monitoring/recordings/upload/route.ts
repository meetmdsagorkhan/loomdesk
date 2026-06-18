import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const chunk = formData.get("chunk") as Blob;
    const recordingId = formData.get("recordingId") as string;
    
    if (!chunk || !recordingId) {
      return NextResponse.json({ error: "Missing chunk or recordingId" }, { status: 400 });
    }

    const downloadsDir = path.join(os.homedir(), "Downloads", "LoomDesk");
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const filePath = path.join(downloadsDir, `video_${recordingId}.webm`);
    const buffer = Buffer.from(await chunk.arrayBuffer());

    // Append chunk to the webm file
    fs.appendFileSync(filePath, buffer);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Upload video chunk error:", error);
    return NextResponse.json({ error: "Failed to upload video chunk" }, { status: 500 });
  }
}
