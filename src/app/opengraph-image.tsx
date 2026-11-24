import { ImageResponse } from 'next/og';

export const alt = "拾级 app preview";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const appName = "拾级";
const description = "Gradus is an AI-powered personal learning task planner. Users type a goal and the system streams a live analysis — parsing intent, decomposing subtasks, est...";

/**
 * 品牌标识：三级台阶（顶点朱红）——与应用内顶栏、落地页同一套。
 * 用 div 直接画，不嵌 base64 位图：换标识不用重新生成 PNG。
 */
const brandMark = (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
    <div style={{ width: 28, height: 38, background: '#111111' }} />
    <div style={{ width: 28, height: 79, background: '#111111' }} />
    <div style={{ width: 28, height: 120, background: '#A8331B' }} />
  </div>
);

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#F7F4EE',
          color: '#1D1B18',
          padding: '76px',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: 168,
              height: 168,
              borderRadius: 40,
              background: '#FFFFFF',
              border: '1px solid #E4DED4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              marginRight: 44,
            }}
          >
            {brandMark}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: 0 }}>
              {appName}
            </div>
            <div
              style={{
                fontSize: 32,
                lineHeight: 1.35,
                color: '#5F5A52',
                marginTop: 24,
                maxWidth: 760,
              }}
            >
              {description}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 28, color: '#8A8176' }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: '#A8331B',
              marginRight: 14,
            }}
          />
          Built with Gradus
        </div>
      </div>
    ),
    size,
  );
}
