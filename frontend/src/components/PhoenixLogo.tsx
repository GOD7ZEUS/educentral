interface PhoenixLogoProps {
  className?: string;
}

export function PhoenixLogo({ className }: PhoenixLogoProps) {
  return <img src="/phoenix-logo.png" alt="EduCentral" className={`object-contain ${className ?? ""}`} />;
}
