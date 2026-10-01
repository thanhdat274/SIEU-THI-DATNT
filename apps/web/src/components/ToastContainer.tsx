import React from 'react';
import {useGameStore} from '../store/useGameStore';
import {PixelButton,PixelIcon} from './pixel';
export const ToastContainer:React.FC=()=>{
 const {toasts,removeToast}=useGameStore();
 return <div className="toast-stack" aria-live="polite" aria-atomic="false">{toasts.slice(-2).map(t=><div key={t.id} className={`toast toast-${t.type}`}><PixelIcon name={t.type==='success'?'check':t.type==='warn'?'warning':'book'}/><span>{t.message}</span><PixelButton icon="close" aria-label="Ẩn thông báo" onClick={()=>removeToast(t.id)}/></div>)}</div>;
};
