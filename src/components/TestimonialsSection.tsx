"use client";

import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card } from "./ui/card";

const testimonials = [
  {
    name: "Aanya Menon",
    role: "League Commissioner, Delhi Premier League",
    image: "/testimonial1.jpeg",
    content: "BracketFlow keeps every Delhi venue, umpire duty, and rain delay synced in seconds. Our volunteers finally operate from one shared source of truth."
  },
  {
    name: "Arjun Patel",
    role: "Operations Lead, Mumbai Badminton Circuit",
    image: "/testimonial2.jpeg",
    content: "Automated draws and rest rules cut two full days from scheduling. Parents and coaches now get conflict-free fixtures straight to their phones."
  },
  {
    name: "Kavya Rao",
    role: "Head of Events, Bengaluru Athletics Council",
    image: "/testimonial3.jpeg",
    content: "Live scoring beams from every track to our broadcast overlays without any double entry. It genuinely feels like we added another coordinator to the crew."
  },
  {
    name: "Rohan Singh",
    role: "Technical Director, Chennai Table Tennis League",
    image: "/testimonial4.jpg",
    content: "From accreditation to table rotations, officials thrive with automated text updates. Protest handling is faster because every action is logged."
  },
  {
    name: "Priya Desai",
    role: "Tournament Chair, Kolkata Youth Football Cup",
    image: "/testimonial2.jpeg?variant=coach",
    content: "Heat indexes and workload alerts help us adjust kick-off times proactively. Families trust the transparency because standings update instantly."
  },
  {
    name: "Vedant Iyer",
    role: "Director of Competitions, Hyderabad Pro Kabaddi Series",
    image: "/testimonial3.jpeg?variant=director",
    content: "Multi-venue oversight, credential checks, and logistics sit in a single dashboard. BracketFlow has become the backbone of our Southern calendar."
  }
];

const TestimonialsSection = () => {
  return (
    <section className="py-20 overflow-hidden bg-black">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-normal mb-4">Trusted by Tournament Directors</h2>
          <p className="text-muted-foreground text-lg">
            Organizers of every size orchestrate fair competition with BracketFlow.
          </p>
        </motion.div>

        <div className="relative flex flex-col antialiased">
          <div className="relative flex overflow-hidden py-4">
            <div className="animate-marquee flex min-w-full shrink-0 items-stretch gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={`${index}-1`} className="w-[400px] shrink-0 bg-black/40 backdrop-blur-xl border-white/5 hover:border-white/10 transition-all duration-300 p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={testimonial.image} />
                      <AvatarFallback>{testimonial.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium text-white/90">{testimonial.name}</h4>
                      <p className="text-sm text-white/60">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-white/70 leading-relaxed">
                    {testimonial.content}
                  </p>
                </Card>
              ))}
            </div>
            <div className="animate-marquee flex min-w-full shrink-0 items-stretch gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={`${index}-2`} className="w-[400px] shrink-0 bg-black/40 backdrop-blur-xl border-white/5 hover:border-white/10 transition-all duration-300 p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={testimonial.image} />
                      <AvatarFallback>{testimonial.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium text-white/90">{testimonial.name}</h4>
                      <p className="text-sm text-white/60">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-white/70 leading-relaxed">
                    {testimonial.content}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;