import blossomArt from '../assets/sky-cherry/blossoms.png';
import petalDay from '../assets/sky-cherry/petal-day.svg';
import petalNight from '../assets/sky-cherry/petal-night.svg';
type Region = 'brand' | 'sidebar' | 'cover' | 'canvas';
function Blossom({
  x,
  y,
  r = 16,
  illustrated = false,
}: {
  x: number;
  y: number;
  r?: number;
  illustrated?: boolean;
}) {
  // Preserve the exact envelope of the original circles: x [-1.35r, 1.42r], y [-1.3r, 1.25r].
  if (illustrated)
    return (
      <g transform={`translate(${x} ${y})`} className="cherry-blossom painted-blossom">
        <image
          className="painted-blossom-art"
          href={blossomArt}
          x={-r * 1.35}
          y={-r * 1.3}
          width={r * 2.77}
          height={r * 2.55}
          preserveAspectRatio="none"
        />
      </g>
    );
  return (
    <g transform={`translate(${x} ${y})`} className="cherry-blossom">
      <circle cx={-r * 0.65} cy={0} r={r * 0.7} />
      <circle cx={-r * 0.3} cy={-r * 0.6} r={r * 0.7} />
      <circle cx={r * 0.4} cy={-r * 0.5} r={r * 0.72} />
      <circle cx={r * 0.7} cy={r * 0.15} r={r * 0.72} />
      <circle cx={0} cy={r * 0.45} r={r * 0.8} />
      <circle className="cherry-highlight" cx={-r * 0.2} cy={-r * 0.25} r={r * 0.65} />
    </g>
  );
}
export function Decorations({ region }: { region: Region }) {
  return (
    <div
      className={`visual-decoration decoration-${region}`}
      data-decoration-region={region}
      aria-hidden="true"
      inert
    >
      {region === 'cover' ? (
        <div className="cover-painting" />
      ) : region === 'brand' ? (
        <>
          <svg viewBox="0 0 230 78" preserveAspectRatio="xMidYMid meet">
            <path className="cherry-branch" d="M224 75Q222 39 191 26M218 48L232 32M203 32L191 9" />
            <Blossom x={190} y={20} r={14} illustrated />
            <Blossom x={221} y={36} r={12} illustrated />
            <path className="cherry-leaf" d="M182 44q-14-16-22-7 4 15 22 7" />
            <Blossom x={5} y={68} r={12} illustrated />
          </svg>
          <span className="logo-petal petal-one" />
          <span className="logo-petal petal-two" />
          <span className="logo-petal petal-three" />
        </>
      ) : region === 'sidebar' ? (
        <svg viewBox="0 0 250 900" preserveAspectRatio="xMaxYMax slice">
          <path
            className="cherry-branch"
            d="M264 883Q234 710 260 535M248 733Q209 692 190 642M251 635Q232 600 206 588M233 704L211 686"
          />
          <Blossom x={248} y={550} r={38} illustrated />
          <Blossom x={235} y={610} r={30} illustrated />
          <Blossom x={212} y={650} r={24} illustrated />
          <Blossom x={248} y={696} r={38} illustrated />
          <Blossom x={254} y={810} r={42} illustrated />
          <Blossom x={207} y={852} r={27} illustrated />
          <path
            className="cherry-leaf"
            d="M204 700q-22-26-37-7 11 22 37 7M247 780q-35-17-37 6 19 15 37-6"
          />
          <g className="still-petals">
            <g transform="rotate(30 225 280)">
              <image
                className="blossom-day"
                href={petalDay}
                x={220}
                y={271}
                width={10}
                height={18}
              />
              <image
                className="blossom-night"
                href={petalNight}
                x={220}
                y={271}
                width={10}
                height={18}
              />
            </g>
            <g transform="rotate(-30 23 420)">
              <image className="blossom-day" href={petalDay} x={19} y={413} width={8} height={14} />
              <image
                className="blossom-night"
                href={petalNight}
                x={19}
                y={413}
                width={8}
                height={14}
              />
            </g>
            <g transform="rotate(0 224 486)">
              <image
                className="blossom-day"
                href={petalDay}
                x={220}
                y={479}
                width={8}
                height={14}
              />
              <image
                className="blossom-night"
                href={petalNight}
                x={220}
                y={479}
                width={8}
                height={14}
              />
            </g>
            <g transform="rotate(35 45 797)">
              <image className="blossom-day" href={petalDay} x={41} y={790} width={8} height={14} />
              <image
                className="blossom-night"
                href={petalNight}
                x={41}
                y={790}
                width={8}
                height={14}
              />
            </g>
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 1440 700" preserveAspectRatio="xMidYMax slice">
          <path className="distant-hill" d="M0 553Q200 466 420 584T850 561T1440 522V700H0Z" />
          <path className="near-hill" d="M0 636Q300 560 590 642T1160 617T1440 639V700H0Z" />
          <path className="cherry-branch" d="M1400 700Q1398 573 1359 520M1396 606L1430 560" />
          <Blossom x={1361} y={532} r={72} illustrated />
          <Blossom x={1432} y={560} r={74} illustrated />
          <Blossom x={-25} y={612} r={86} />
          <Blossom x={42} y={650} r={45} />
          <g className="landscape-cloud">
            <path d="M120 310q-10-25 13-30 2-28 29-25 24-4 32 20 24-3 27 18 23 0 22 17z" />
            <path d="M1140 205q-10-25 13-30 2-28 29-25 24-4 32 20 24-3 27 18 23 0 22 17z" />
          </g>
        </svg>
      )}
    </div>
  );
}
