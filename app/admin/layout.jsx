'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LogOut, LayoutDashboard, Users, Store, Bike, Calendar, ShieldCheck, Star, Settings, Menu, Package, ShoppingCart, ChevronDown, Bell, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const SidebarItem = ({ href, icon: Icon, label, active }) => (
    <Link href={href}>
        <div className={`flex items-center gap-3 px-4 py-3 mx-3 rounded-lg transition-all duration-200 group ${active ? 'bg-white/20 text-white shadow-sm' : 'hover:bg-white/10 text-white/80 hover:text-white'}`}>
            <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-white/80 group-hover:text-white'}`} />
            <span className="font-medium tracking-wide text-sm">{label}</span>
        </div>
    </Link>
)

export default function AdminLayout({ children }) {
    const router = useRouter()
    const pathname = usePathname()
    const [mounted, setMounted] = useState(false)
    const [user, setUser] = useState(null)

    useEffect(() => {
        setMounted(true)
        const token = localStorage.getItem('adminToken')
        const storedUser = localStorage.getItem('adminUser')
        if (!token) {
            router.push('/admin/login')
        } else {
            setUser(storedUser ? JSON.parse(storedUser) : { email: 'Admin' })
        }
    }, [router])

    const handleLogout = () => {
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminUser')
        router.push('/admin/login')
    }

    if (!mounted) return null
    if (pathname === '/admin/login') return <>{children}</>

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-gradient-to-b from-orange-600 via-orange-600 to-red-600 text-white shadow-xl">
            <div className="p-6 flex items-center gap-3 border-b border-white/10">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <ShieldCheck className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-white">EasyRasta</h1>
                    <p className="text-xs text-white/70 font-medium">Super Admin</p>
                </div>
            </div>

            <nav className="flex-1 py-6 space-y-1 overflow-y-auto scrollbar-thin">
                <SidebarItem href="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" active={pathname === '/admin/dashboard'} />

                <div className="px-6 py-3 text-xs font-bold text-white/50 uppercase tracking-widest mt-2">Management</div>
                <SidebarItem href="/admin/vendors" icon={Store} label="Vendors" active={pathname === '/admin/vendors'} />
                <SidebarItem href="/admin/businesses" icon={Store} label="Businesses" active={pathname === '/admin/businesses'} />
                <SidebarItem href="/admin/riders" icon={Bike} label="Riders" active={pathname === '/admin/riders'} />
                <SidebarItem href="/admin/products" icon={Package} label="Products" active={pathname.startsWith('/admin/products')} />
                <SidebarItem href="/admin/orders" icon={ShoppingCart} label="Orders" active={pathname === '/admin/orders'} />
                <SidebarItem href="/admin/events" icon={Calendar} label="Events" active={pathname === '/admin/events'} />
                <SidebarItem href="/admin/messages" icon={Mail} label="Messages" active={pathname === '/admin/messages'} />

                <div className="px-6 py-3 text-xs font-bold text-white/50 uppercase tracking-widest mt-2">System</div>
                <SidebarItem href="/admin/amenities" icon={Settings} label="Amenities" active={pathname === '/admin/amenities'} />
                <SidebarItem href="/admin/xp-rules" icon={ShieldCheck} label="XP Rules" active={pathname === '/admin/xp-rules'} />
                <SidebarItem href="/admin/reviews" icon={Star} label="Reviews" active={pathname === '/admin/reviews'} />
            </nav>

            <div className="p-4 border-t border-white/10 bg-black/5">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <Avatar className="border-2 border-white/20">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-orange-700 text-white">AD</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                        <p className="text-xs text-white/60">Admin</p>
                    </div>
                </div>
                <Button variant="ghost" className="w-full justify-start text-white/90 hover:text-white hover:bg-white/10" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
    )

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-72 fixed inset-y-0 z-50">
                <SidebarContent />
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-orange-600 to-red-600 text-white z-40 flex items-center px-4 justify-between shadow-md">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6" />
                    <div className="font-bold text-lg">EasyRasta</div>
                </div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20"><Menu /></Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 border-none w-72">
                        <SidebarContent />
                    </SheetContent>
                </Sheet>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 md:ml-72 flex flex-col min-h-screen transition-all duration-300">
                {/* Desktop Top Header */}
                <header className="hidden md:flex h-16 bg-white border-b items-center justify-between px-8 sticky top-0 z-30 shadow-sm/50 backdrop-blur-sm bg-white/80">
                    <div className="flex items-center text-sm breadcrumbs text-gray-500">
                        <span className="font-medium text-gray-900">Admin</span>
                        <span className="mx-2">/</span>
                        <span className="capitalize">{pathname.split('/').pop()}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-orange-600">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full"></span>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 hover:bg-orange-50 hover:text-orange-700 p-1 pr-3 rounded-full border border-transparent hover:border-orange-100 transition-all">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-orange-100 text-orange-600 text-xs">AD</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium hidden lg:block">Admin User</span>
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Profile</DropdownMenuItem>
                                <DropdownMenuItem>Settings</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 animate-in fade-in zoom-in-95 duration-300">
                    <div className="max-w-6xl mx-auto space-y-6">
                        {children}
                    </div>
                </main>

                {/* Footer */}
                <footer className="h-16 border-t bg-white flex items-center justify-between px-8 text-sm text-gray-500">
                    <p>&copy; {new Date().getFullYear()} EasyRasta Admin Panel.</p>
                    <div className="flex gap-4">
                        <a href="#" className="hover:text-orange-600">Support</a>
                        <a href="#" className="hover:text-orange-600">Documentation</a>
                    </div>
                </footer>
            </div>
        </div>
    )
}
