import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function WebsiteLayout({ children }) {
    return (
        <>
            <Header />
            <main className="min-h-screen">
                {children}
            </main>
            <Footer />
        </>
    );
}
