import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useAuth } from "@/contexts/AuthContext";

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const handleHostClick = () => {
    if (isAuthenticated) {
      navigate("/host");
    } else {
      navigate("/host/login");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    if (location.pathname !== "/") {
      navigate("/", { state: { scrollTo: sectionId } });
      return;
    }
    if (sectionId === 'testimonials') {
      const testimonialSection = document.querySelector('.animate-marquee');
      if (testimonialSection) {
        const yOffset = -100; // Offset to account for the fixed header
        const y = testimonialSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    } else if (sectionId === 'cta') {
      const ctaSection = document.querySelector('.button-gradient');
      if (ctaSection) {
        const yOffset = -100;
        const y = ctaSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const sectionLinks = [
    { name: "Features", sectionId: "features" },
  ];

  return (
    <header
      className={`fixed top-3.5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 rounded-full ${
        isScrolled 
          ? "h-14 bg-[#1B1B1B]/40 backdrop-blur-xl border border-white/10 scale-95 w-[90%] max-w-2xl" 
          : "h-14 bg-[#1B1B1B] w-[95%] max-w-3xl"
      }`}
    >
      <div className="mx-auto h-full px-6">
        <nav className="flex items-center justify-between h-full">
          <div className="flex items-center gap-2">
            <img 
              src="/bracketflow-logo.png" 
              alt="BracketFlow Logo" 
              className="w-5 h-5"
            />
            <span className="font-bold text-base">BracketFlow India</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {sectionLinks.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => scrollToSection(item.sectionId)}
                className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300"
              >
                {item.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate("/umpire")}
              className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300"
            >
              Umpires
            </button>
            <button
              type="button"
              onClick={handleHostClick}
              className="text-sm text-muted-foreground hover:text-foreground transition-all duration-300"
            >
              Host
            </button>
            <Button 
              size="sm"
              className="button-gradient"
              onClick={() => navigate("/tournaments")}
            >
              Tournaments
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="glass">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-[#1B1B1B]">
                <div className="flex flex-col gap-4 mt-8">
                  {sectionLinks.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className="text-lg text-muted-foreground hover:text-foreground transition-colors text-left"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        scrollToSection(item.sectionId);
                      }}
                    >
                      {item.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="text-lg text-muted-foreground hover:text-foreground transition-colors text-left"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/umpire");
                    }}
                  >
                    Umpires
                  </button>
                  <button
                    type="button"
                    className="text-lg text-muted-foreground hover:text-foreground transition-colors text-left"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleHostClick();
                    }}
                  >
                    Host
                  </button>
                  <Button 
                    className="button-gradient mt-4"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/tournaments");
                    }}
                  >
                    Tournaments
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navigation;