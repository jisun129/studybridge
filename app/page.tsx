import Link from "next/link";
export default function Home() {
  return (
    <section className="intro card">
      <p className="eyebrow">READ • UNDERSTAND • KEEP</p>
      <h1>
        영어로 배우는 공부,
        <br />
        문맥을 잃지 않고.
      </h1>
      <p>
        논문이나 강의의 발췌문을 영어·한국어로 나란히 읽고, 필요한 표현만 내
        어휘에 남겨 보세요.
      </p>
      <div className="row">
        <Link className="primary" href="/reading">
          읽기 시작하기
        </Link>
        <Link className="secondary" href="/auth">
          이메일 로그인
        </Link>
        <Link href="/demo">샘플 살펴보기</Link>
      </div>
      <p className="muted">
        붙여넣은 텍스트는 번역과 설명을 위해 AI 제공자에 전송됩니다. 전체 자료는
        앱 데이터베이스에 보관하지 않습니다.
      </p>
    </section>
  );
}
