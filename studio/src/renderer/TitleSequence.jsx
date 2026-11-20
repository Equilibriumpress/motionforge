import {interpolate,useCurrentFrame,useVideoConfig} from 'remotion';

// Native SVG elements only. This browser-renderable Remotion composition
// deliberately avoids HTML-in-canvas, external fonts, and unsupported media.
export default function TitleSequence({title,subtitle,background,accent}) {
  const frame=useCurrentFrame();
  const {fps,width,height}=useVideoConfig();
  const enter=interpolate(frame,[0,Math.max(1,fps*.7)],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const line=interpolate(frame,[fps*.3,fps*2],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const subtitleOpacity=interpolate(frame,[fps*1.2,fps*2],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const headingSize=Math.round(Math.min(width*.081,height*.128));
  const subSize=Math.round(Math.min(width*.026,height*.044));
  const vertical=height>width;
  const left=width*.10;
  const titleY=vertical?height*.48:height*.49;
  const lineY=vertical?height*.60:height*.64;
  const lowerY=vertical?height*.68:height*.75;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height}
      viewBox={'0 0 '+width+' '+height} preserveAspectRatio="xMidYMid meet">
      <rect width={width} height={height} fill={background} />
      <path d={'M '+left+' '+lineY+' Q '+(width*.44)+' '+(lineY-height*.16)+' '+(width*.71)+' '+(lineY-height*.04)+' T '+(width*.90)+' '+(lineY-height*.18)}
        fill="none" stroke={accent} strokeWidth={Math.max(3,width*.006)} strokeLinecap="round"
        pathLength={1} strokeDasharray={1} strokeDashoffset={1-line}/>
      <circle cx={left} cy={lineY} r={Math.max(5,width*.007)} fill={accent} opacity={line}/>
      <text x={left} y={titleY} fill="#f7f3ed"
        fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize={headingSize}
        letterSpacing="-2" opacity={enter}>{title}</text>
      <text x={left} y={lowerY} fill={accent}
        fontFamily="Arial, Helvetica, sans-serif" fontWeight="600" fontSize={subSize}
        letterSpacing="2" opacity={subtitleOpacity}>{subtitle}</text>
      <text x={left} y={height*.12} fill="#93a5b2"
        fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize={Math.round(Math.max(12,width*.014))}
        letterSpacing="3">MOTIONFORGE · STUDIO</text>
    </svg>
  );
}
