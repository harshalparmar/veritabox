import './BanterLoader.css';
import { CSSProperties } from 'react';

export function BanterLoader({ className, scale = 1 }: { className?: string, scale?: number }) {
  const style = { '--loader-scale': scale } as CSSProperties;
  return (
    <div className={`banter-loader-container ${className || ''}`} style={style}>
      <div className="banter-loader">
        <div className="banter-loader__box"></div>
        <div className="banter-loader__box"></div>
        <div className="banter-loader__box"></div>
        <div className="banter-loader__box"></div>
        <div className="banter-loader__box"></div>
        <div className="banter-loader__box"></div>
        <div className="banter-loader__box"></div>
        <div className="banter-loader__box"></div>
        <div className="banter-loader__box"></div>
      </div>
    </div>
  );
}
