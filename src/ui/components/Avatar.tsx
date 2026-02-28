import React from 'react'

export default React.memo(function Avatar({seed, kind}:{seed:string, kind:'cat'|'dog'}){
  const hue = [...seed].reduce((a,c)=> a + c.charCodeAt(0), 0) % 360
  return (
    <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-slate-300 dark:ring-slate-600">
      <svg width="100%" height="100%" viewBox="0 0 80 80">
        <rect width="80" height="80" rx="40" fill={`hsl(${hue},70%,80%)`}/>
        {kind === 'cat' && (
          <path d="M20,20 L40,10 L40,30 Z" fill={`hsl(${(hue+40)%360},70%,70%)`}/>
        )}
        <circle cx="30" cy="40" r="18" fill="white" opacity={0.9}/>
        <circle cx="50" cy="40" r="18" fill="white" opacity={0.9}/>
        <circle cx="30" cy="40" r="5" fill="black"/>
        <circle cx="50" cy="40" r="5" fill="black"/>
        {kind === 'dog' && (
          <circle cx="35" cy="20" r="6" fill={`hsl(${(hue+220)%360},70%,60%)`}/>
        )}
      </svg>
    </div>
  )
})
