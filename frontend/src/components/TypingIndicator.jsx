export default function TypingIndicator({ typingUsers }) {
  if (!typingUsers || typingUsers.size === 0) return null
  const names = [...typingUsers].join(', ')
  return (
    <div className="px-4 pb-1 text-xs text-gray-500 h-5">
      {names} {typingUsers.size === 1 ? 'is' : 'are'} typing
      <span className="animate-pulse">…</span>
    </div>
  )
}