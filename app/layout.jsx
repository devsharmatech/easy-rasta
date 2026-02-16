import './globals.css'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: 'EasyRasta',
    description: 'Rider Ecosystem Super App',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={cn(inter.className, "min-h-screen bg-background font-sans antialiased")}>
                {children}
                <Toaster />
            </body>
        </html>
    )
}
