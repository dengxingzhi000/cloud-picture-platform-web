import { useEffect, useRef, useState } from 'react';

interface LazyTiltedCardProps {
  children: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}

/**
 * 懒加载包装组件
 * 只有当子组件进入视口时才渲染，优化性能
 */
export default function LazyWrapper({ 
  children, 
  threshold = 0.1,
  rootMargin = '50px'
}: LazyTiltedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // 一旦可见，就停止观察（避免重复触发）
          observer.unobserve(element);
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return (
    <div ref={ref} style={{ width: '100%', height: '100%' }}>
      {isVisible ? children : (
        <div style={{ 
          width: '100%', 
          height: '240px',
          background: 'linear-gradient(90deg, #efe7dd 25%, #f5f0ea 50%, #efe7dd 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
          borderRadius: '14px'
        }} />
      )}
    </div>
  );
}
