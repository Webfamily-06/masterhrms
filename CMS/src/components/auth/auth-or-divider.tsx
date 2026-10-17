const AuthOrDivider = () => {
  return (
    <div className="relative flex items-center justify-center gap-2">
      <span className="block h-px w-[43px] shrink-0 bg-[linear-gradient(270deg,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0)_79%)]" />
      <span className="text-tagline-4 text-white/80">Or</span>
      <span className="block h-px w-[43px] shrink-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0)_79%)]" />
    </div>
  );
};

export default AuthOrDivider;
