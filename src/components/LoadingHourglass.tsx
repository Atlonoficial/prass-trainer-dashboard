import { useEffect, useState } from 'react';

interface LoadingHourglassProps {
  message?: string;
  type?: 'training' | 'diet';
  compact?: boolean;
}

export function LoadingHourglass({ message, type = 'training', compact = false }: LoadingHourglassProps) {
  const [currentMessage, setCurrentMessage] = useState(message || 'Iniciando geração...');

  const messages = type === 'diet' 
    ? [
        'Analisando dados nutricionais...',
        'Calculando necessidades calóricas...',
        'Selecionando alimentos ideais...',
        'Organizando refeições semanais...',
        'Finalizando plano alimentar...'
      ]
    : [
        'Analisando dados do estudante...',
        'Calculando volume de treino...',
        'Selecionando exercícios...',
        'Organizando sequência de treino...',
        'Finalizando plano de treino...'
      ];

  useEffect(() => {
    if (!message) {
      let index = 0;
      const interval = setInterval(() => {
        setCurrentMessage(messages[index % messages.length]);
        index++;
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [message, messages]);

  const size = compact ? '64px' : '96px';

  return (
    <div className={`flex flex-col items-center justify-center ${compact ? 'py-6' : 'py-12'}`}>
      <div className={`relative ${compact ? 'mb-4' : 'mb-6'}`}>
        {/* Realistic SVG Hourglass */}
        <div 
          aria-label="Carregando" 
          style={{
            '--sand': 'hsl(var(--primary))',
            '--glass': 'hsl(var(--primary))',
            '--size': size,
            '--dur': '2.8s'
          } as React.CSSProperties}
        >
          <style>{`
            .hg{ width:var(--size); height:var(--size); display:block; shape-rendering:geometricPrecision; contain: layout paint size; }
            .stroke{ vector-effect: non-scaling-stroke; stroke-linecap:round; stroke-linejoin:round; }

            .frame{ transform-box: fill-box; transform-origin:50% 50%; animation: frameSpin var(--dur) linear infinite; will-change: transform; }
            .topVol{ transform-box: fill-box; transform-origin:50% 100%; animation: topFlow var(--dur) cubic-bezier(.3,0,.2,1) infinite; will-change: transform,opacity; }
            .botVol{ transform-box: fill-box; transform-origin:50% 0%; animation: botFlow var(--dur) cubic-bezier(.3,0,.2,1) infinite; will-change: transform,opacity; }
            .stream{ transform-box: fill-box; transform-origin:50% 0%; animation: jetFlow var(--dur) linear infinite; will-change: transform,opacity; }

            @keyframes frameSpin{ 0%{transform:rotate(0)} 22%{transform:rotate(180deg)} 100%{transform:rotate(180deg)} }

            @keyframes topFlow{
              0%,22%   { transform:scaleY(1); opacity:0; }
              22.001%  { opacity:1; }
              100%     { transform:scaleY(0); opacity:1; }
            }
            @keyframes botFlow{
              0%,22%   { transform:scaleY(0); opacity:0; }
              22.001%  { opacity:1; }
              100%     { transform:scaleY(1); opacity:1; }
            }
            @keyframes jetFlow{
              0%,22%   { opacity:0; transform:scaleY(.2); }
              22.001%  { opacity:1; transform:scaleY(1); }
              98%      { opacity:1; transform:scaleY(1); }
              100%     { opacity:0; transform:scaleY(.2); }
            }

            .hg *, .frame, .topVol, .botVol, .stream{ animation-play-state: running !important; }
          `}</style>

          <svg className="hg" viewBox="0 0 120 120" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <defs>
              <rect id="bar" x="28" y="0" width="64" height="6" rx="3"/>
              <path id="left"  d="M28,24 C40,40 52,50 60,60 C68,70 80,80 92,96"/>
              <path id="right" d="M92,24 C80,40 68,50 60,60 C52,70 40,80 28,96"/>

              <clipPath id="triTop"><polygon points="28,24 92,24 60,60"/></clipPath>
              <clipPath id="triBot"><polygon points="28,96 92,96 60,60"/></clipPath>
              <clipPath id="glassAll"><path d="M28,24 L92,24 L60,60 L28,96 L92,96 Z"/></clipPath>

              <mask id="maskTop" maskUnits="userSpaceOnUse"><rect x="28" y="24" width="64" height="36" fill="#fff"/><ellipse cx="60" cy="60" rx="22" ry="6" fill="#000"/></mask>
              <mask id="maskBot" maskUnits="userSpaceOnUse"><rect x="28" y="60" width="64" height="36" fill="#fff"/><ellipse cx="60" cy="60" rx="22" ry="6" fill="#fff"/></mask>

              <linearGradient id="sandGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--sand)" stopOpacity=".95"/>
                <stop offset="100%" stopColor="var(--sand)" stopOpacity="1"/>
              </linearGradient>
              <radialGradient id="glassShine" cx="50%" cy="50%" r="85%">
                <stop offset="0%" stopColor="#fff" stopOpacity=".10"/>
                <stop offset="60%" stopColor="#fff" stopOpacity="0"/>
              </radialGradient>
            </defs>

            {/* AREIA (não gira) */}
            <g clipPath="url(#triTop)">
              <g className="topVol">
                <rect x="28" y="24" width="64" height="36" fill="url(#sandGrad)" mask="url(#maskTop)"/>
              </g>
            </g>
            <g clipPath="url(#glassAll)">
              <rect className="stream" x="59" y="56" width="2" height="12" rx="1" fill="var(--sand)"/>
            </g>
            <g clipPath="url(#triBot)">
              <g className="botVol">
                <rect x="28" y="60" width="64" height="36" fill="url(#sandGrad)" mask="url(#maskBot)"/>
              </g>
            </g>

            {/* FRAME (gira) por cima da areia */}
            <g className="frame">
              <use href="#bar" y="14" fill="var(--glass)"/>
              <use href="#bar" y="100" fill="var(--glass)"/>
              <use href="#left"  className="stroke" stroke="var(--glass)" strokeWidth="3" fill="none"/>
              <use href="#right" className="stroke" strokeWidth="3" stroke="var(--glass)" fill="none"/>
              <g clipPath="url(#glassAll)">
                <rect x="-10" y="0" width="140" height="120" fill="url(#glassShine)"/>
              </g>
            </g>
          </svg>
        </div>
      </div>
      
      <div className="text-center max-w-xs">
        <h3 className={`font-semibold text-foreground mb-2 ${compact ? 'text-base' : 'text-lg'}`}>
          {type === 'diet' ? 'Gerando Plano Alimentar' : 'Gerando Plano de Treino'}
        </h3>
        <p className={`text-muted-foreground animate-fade-in ${compact ? 'text-xs' : 'text-sm'}`}>
          {currentMessage}
        </p>
        
        {/* Progress dots */}
        <div className={`flex justify-center space-x-1 ${compact ? 'mt-3' : 'mt-4'}`}>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}