"use client";
import { useState } from "react";
import Reading from "@/components/reading";
import Vocabulary from "@/components/vocabulary";
export default function Demo() {
  const [page, setPage] = useState("reading");
  return (
    <>
      <div className="row" style={{ marginBottom: 24 }}>
        <button className="secondary" onClick={() => setPage("reading")}>
          샘플 읽기
        </button>
        <button className="secondary" onClick={() => setPage("vocabulary")}>
          샘플 어휘
        </button>
      </div>
      {page === "reading" ? <Reading demo /> : <Vocabulary demo />}
    </>
  );
}
