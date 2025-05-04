import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-light py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between md:flex-row">
          <div className="mb-4 md:mb-0">
            <h2 className="font-display text-xl font-bold text-primary">Our Time Press</h2>
            <p className="text-sm text-muted-foreground mt-1">Writers Portal</p>
          </div>
          <div className="flex space-x-4 text-sm text-muted-foreground">
            <Link href="#help" className="hover:text-primary">Help Center</Link>
            <Link href="#privacy" className="hover:text-primary">Privacy Policy</Link>
            <Link href="#terms" className="hover:text-primary">Terms of Service</Link>
            <Link href="#contact" className="hover:text-primary">Contact Us</Link>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-neutral-light">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Our Time Press. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
