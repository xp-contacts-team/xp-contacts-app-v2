import { avatarTone, initials } from '../lib/format'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  return (
    <span
      className={`avatar avatar-${size} avatar-tone-${avatarTone(name)} ${className}`.trim()}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
