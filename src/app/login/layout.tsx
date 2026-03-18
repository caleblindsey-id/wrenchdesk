export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="-ml-60 min-h-screen flex items-center justify-center bg-gray-900">
      {children}
    </div>
  )
}
