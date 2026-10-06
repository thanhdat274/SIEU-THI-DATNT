import React,{useRef,useState} from 'react';
import {useGameStore} from '../store/useGameStore';
import {PixelButton} from './pixel';
export const VirtualJoystick:React.FC<{onMove:(x:number,y:number)=>void;onInteract:()=>void}>=({onMove,onInteract})=>{
 const ref=useRef<HTMLDivElement>(null),pointer=useRef<number|null>(null),[knob,setKnob]=useState({x:0,y:0});
 const nearby=useGameStore(s=>s.nearbyFixture);
 const move=(x:number,y:number)=>{const r=ref.current!.getBoundingClientRect(),radius=r.width*0.3,dx=x-r.left-r.width/2,dy=y-r.top-r.height/2,d=Math.hypot(dx,dy),ratio=d>radius?radius/d:1;setKnob({x:dx*ratio,y:dy*ratio});onMove(dx*ratio/radius,dy*ratio/radius);};
 const end=()=>{pointer.current=null;setKnob({x:0,y:0});onMove(0,0);};
 return <div className="touch-controls"><div ref={ref} role="group" aria-label="Joystick di chuyển" className="joystick" onPointerDown={e=>{if(pointer.current!==null)return;pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);move(e.clientX,e.clientY);}} onPointerMove={e=>{if(pointer.current===e.pointerId)move(e.clientX,e.clientY);}} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}><div className="joystick-knob" style={{transform:`translate(${knob.x}px,${knob.y}px)`}}/></div><PixelButton icon="hand" className="touch-interact" disabled={!nearby} onClick={onInteract} aria-label="Tương tác">Xem</PixelButton></div>;
};
