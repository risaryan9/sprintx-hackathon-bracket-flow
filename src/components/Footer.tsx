import { Github, Linkedin } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="w-full py-12 mt-20">
      <div className="container px-4">
        <div className="glass glass-hover rounded-xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <h3 className="font-medium text-lg">BracketFlow India</h3>
              <p className="text-sm text-muted-foreground">
                Automating every phase of the tournament lifecycle for federations, leagues, and academies across India.
              </p>
              <div className="flex space-x-4">
                <Button 
                  variant="ghost" 
                  size="icon"
                  asChild
                >
                  <a 
                    href="https://github.com/risaryan9/sprintx-hackathon-bracket-flow" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                  >
                    <Github className="w-4 h-4" />
                  </a>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  asChild
                >
                  <a 
                    href="https://www.linkedin.com/in/aryan-r-a54b48358/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Platform</h4>
              <ul className="space-y-2">
                <li>
                  <a 
                    href="/#features" 
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      if (window.location.pathname !== '/') {
                        window.location.href = '/#features';
                      } else {
                        const element = document.getElementById('features');
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth' });
                        }
                      }
                    }}
                  >
                    Features
                  </a>
                </li>
                <li>
                  <Link to="/tournaments" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Tournaments
                  </Link>
                </li>
                <li>
                  <Link to="/umpire" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Umpires
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/host" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Host Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/host/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Host Login
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 text-center">
            <p className="text-sm text-muted-foreground">
              Thank you for Sprintx hackathon for giving me this opportunity :)
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;