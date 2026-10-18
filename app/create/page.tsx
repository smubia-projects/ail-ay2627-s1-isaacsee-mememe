import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { CreateClient } from "./CreateClient";

export const metadata: Metadata = {
  title: "Make a sticker",
  description: "Upload a photo, pick a vibe and a style, and get a die-cut meme sticker.",
};

export default function CreatePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 pt-2">
        <h1 className="sr-only">Make a sticker</h1>
        <CreateClient />
      </main>
    </>
  );
}
