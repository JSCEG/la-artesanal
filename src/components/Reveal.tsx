import { type CSSProperties, type ReactNode, type HTMLAttributes } from 'react'
import { useReveal } from '../hooks/useReveal'

type Props = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  delay?: number
  y?: number
  as?: 'div' | 'section' | 'article'
}

export default function Reveal({ children, delay = 0, y = 24, className = '', as = 'div', style, ...rest }: Props) {
  const { ref, visible } = useReveal<HTMLDivElement>()

  const mergedStyle: CSSProperties = {
    transition: 'opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
    transitionDelay: `${delay}ms`,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
    willChange: 'opacity, transform',
    ...style,
  }

  const Component: any = as
  return (
    <Component ref={ref} className={className} style={mergedStyle} {...rest}>
      {children}
    </Component>
  )
}
