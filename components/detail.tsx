import type { Detail, Sentence } from "@/lib/contracts";
export default function DetailContent({
  detail,
  sentence,
}: {
  detail: Detail;
  sentence: Sentence;
}) {
  return (
    <>
      <h2>{detail.expression}</h2>
      <h3>이 문맥에서의 의미</h3>
      <p>{detail.meaning}</p>
      <h3>쓰임과 문법</h3>
      <p>{detail.usage}</p>
      {detail.generalMeaning && (
        <>
          <h3>일반적인 의미</h3>
          <p>{detail.generalMeaning}</p>
        </>
      )}
      <h3>원문 문장</h3>
      <blockquote>
        {sentence.english}
        <br />
        {sentence.korean}
      </blockquote>
      <h3>추가 예문 · AI 생성</h3>
      <p className="muted">아래 예문은 제출한 자료의 인용이 아닙니다.</p>
      {detail.examples.map((example, i) => (
        <div className="example" key={i}>
          <p>{example.english}</p>
          <p>{example.korean}</p>
        </div>
      ))}
    </>
  );
}
