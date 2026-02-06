import { UserMenu } from "@/components/UserMenu";

export default function Layout({ children }) {
    return (
        <div className="relative">
            {/* User Menu - fixed overlay in header area */}
            <div className="fixed top-3 right-6 z-[60]">
                <UserMenu />
            </div>
            {children}
        </div>
    )
}
