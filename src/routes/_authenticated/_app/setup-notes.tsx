import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  KeyRound,
  Mail,
  Clock,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Shield,
  CheckCircle2,
  Lock,
  ChevronRight,
  UserCheck,
  Laptop,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/setup-notes")({
  component: SetupNotesPage,
  head: () => ({
    meta: [
      { title: "2FA Setup & Login Guide · Master ERP" },
      { name: "description", content: "Learn how Email OTP two-factor authentication protects your workspace account." },
    ],
  }),
});

function SetupNotesPage() {
  const steps = [
    {
      num: "01",
      title: "Login Credentials",
      desc: "Enter your registered workspace username or email and account password on the login screen.",
      icon: KeyRound,
      badge: "Step 1",
    },
    {
      num: "02",
      title: "OTP Dispatched",
      desc: "A secure, cryptographically random 6-digit verification code is instantly generated and delivered to your registered email inbox.",
      icon: Mail,
      badge: "5 Min Expiry",
    },
    {
      num: "03",
      title: "Enter 6-Digit Code",
      desc: "Type or paste the 6-digit code into the verification boxes on the screen. The UI auto-advances between digits.",
      icon: ShieldCheck,
      badge: "Single Use",
    },
    {
      num: "04",
      title: "Access ERP Workspace",
      desc: "Upon successful verification, your full authenticated session opens with all modules and role permissions loaded.",
      icon: Laptop,
      badge: "ERP Active",
    },
  ];

  const securityTips = [
    "Never share your 6-digit OTP with anyone, including colleagues or support staff.",
    "TSV Global Solutions will NEVER ask you to disclose or forward your OTP.",
    "Each verification code is valid for exactly 5 minutes and cannot be reused.",
    "A maximum of 5 incorrect attempts is allowed before the code is permanently invalidated.",
    "If you receive a verification email without attempting to sign in, notify your Workspace Administrator immediately.",
    "A 30-second cooldown is enforced between OTP resend requests to protect your inbox.",
  ];

  const troubleshootingSteps = [
    {
      title: "Check Inbox & Spam Folder",
      desc: "Security emails occasionally get routed to spam, junk, or promotional folders. Search for emails from security@tsvhomes.in.",
    },
    {
      title: "Confirm Your Email Address",
      desc: "Ensure you entered the exact email address registered in your employee profile by your Workspace Administrator.",
    },
    {
      title: "Wait for Resend Cooldown",
      desc: "If the email was delayed due to mail provider congestion, wait for the 30-second timer on the verification screen and click 'Resend OTP'.",
    },
    {
      title: "Contact Workspace Administrator",
      desc: "If your email is inaccessible or you cannot receive messages, ask your Workspace Admin to verify your account status in Settings → Workspace → Users.",
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header Breadcrumb & Title */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span>Security</span>
          <ChevronRight className="size-3" />
          <span className="text-primary font-bold">2FA Setup & Login Guide</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4 pt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <ShieldCheck className="size-7 sm:size-8 text-primary" />
              <span>2FA Setup & Login Guide</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Learn how Email OTP verification protects your enterprise account and data privacy.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/settings" search={{ tab: "security" }}>
              <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5">
                <Lock className="size-3.5" />
                <span>Security Settings</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* What is 2FA Hero Card */}
      <Card className="border shadow-xs bg-gradient-to-r from-primary/5 via-card to-background">
        <CardContent className="p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-bold text-[11px]">
              Overview
            </Badge>
            <span className="text-xs font-bold text-muted-foreground">Why Email OTP 2FA Matters</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-foreground">
            What is Two-Factor Authentication?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Two-factor authentication adds an essential second verification barrier after your password. 
            Instead of granting access solely with a username and password, the login process requires:
          </p>
          
          <div className="pt-2 flex items-center gap-2 sm:gap-3 flex-wrap text-xs sm:text-sm font-bold font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-muted/60 border border-border/80">
              Email + Password
            </div>
            <span className="text-primary font-black text-lg">+</span>
            <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary">
              6-Digit Email OTP
            </div>
            <span className="text-muted-foreground font-black text-lg">=</span>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              Secure ERP Workspace Access
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4-Step Process Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <span>How Authentication Works Step-by-Step</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.num} className="border shadow-2xs hover:border-primary/40 transition-all bg-card flex flex-col justify-between">
                <CardHeader className="p-4 pb-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black font-mono text-primary/80">
                      {step.num}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold py-0 h-5 px-1.5 bg-muted/40">
                      {step.badge}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <CardTitle className="text-sm font-bold leading-tight">
                      {step.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1 text-xs text-muted-foreground leading-relaxed">
                  {step.desc}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Grid: Troubleshooting & Security Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Troubleshooting Didn't Receive OTP? */}
        <Card className="lg:col-span-7 border shadow-xs bg-card">
          <CardHeader className="p-5 border-b bg-muted/20">
            <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
              <HelpCircle className="size-4 text-primary" />
              <span>Troubleshooting: Didn't Receive Your OTP?</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Follow these recommended steps if the verification email is not showing in your inbox.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            {troubleshootingSteps.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="size-6 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono font-bold flex items-center justify-center shrink-0 text-xs">
                  {idx + 1}
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground text-xs">{item.title}</p>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Security Rules & Tips */}
        <Card className="lg:col-span-5 border shadow-xs bg-card">
          <CardHeader className="p-5 border-b bg-muted/20">
            <CardTitle className="text-sm font-black flex items-center gap-2 text-foreground">
              <Shield className="size-4 text-emerald-500" />
              <span>Enterprise Security Rules</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Crucial guidelines to keep your credentials protected.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-xs">
            {securityTips.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground leading-relaxed">{tip}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
