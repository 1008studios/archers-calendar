import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Archers Calendar - Free Schedule Generator for Metro Manila Students",
  description: "Information about Archers Calendar, a free schedule wallpaper generator created by Richard Christian Uaje for students in Metro Manila, including DLSU and other universities.",
  robots: "index, follow",
};

export default function InfoPage() {
  return (
    <div className="min-h-screen bg-[#0B100D] text-white p-8 font-sans max-w-3xl mx-auto leading-relaxed">
      <h1 className="text-4xl font-black mb-6 text-dlsu-vivid">Archers Calendar</h1>
      
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3 text-white/90">What is this?</h2>
        <p className="text-white/70">
          Archers Calendar is a **free** online tool designed for students in Metro Manila to help them stay organized. 
          It allows you to convert your messy class schedule into a beautiful, high-resolution wallpaper for your phone, 
          iPad, or laptop.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3 text-white/90">Who is it for?</h2>
        <p className="text-white/70">
          While it was originally inspired by De La Salle University (DLSU) and its ArchersHub system, it is designed to be 
          flexible. Students from any university in Metro Manila (or anywhere else!) can use it to create their custom schedules.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3 text-white/90">The Creator</h2>
        <p className="text-white/70">
          This project was created by **Richard Christian Uaje**. It was built with the goal of providing a simple, 
          aesthetic, and functional utility for the student community.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3 text-white/90">Bugs and Feedback</h2>
        <p className="text-white/70">
          The app is still in active development. If you encounter any bugs, glitches, or have suggestions for new features, 
          please report them directly to the developer. Your feedback helps make this tool better for everyone.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-3 text-white/90">Cost</h2>
        <p className="text-white/70">
          Archers Calendar is and will remain **completely free** to use. No subscriptions, no hidden fees.
        </p>
      </section>

      <footer className="mt-12 pt-8 border-t border-white/10 text-white/30 text-sm">
        <p>&copy; 2026 Archers Calendar. Created by Richard Christian Uaje.</p>
      </footer>
    </div>
  );
}
