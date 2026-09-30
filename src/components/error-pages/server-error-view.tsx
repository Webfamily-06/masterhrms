import React, { useState } from "react";
import { useCurrentProfile } from "@/lib/session";
import { resolveDefaultRoute } from "@/lib/auth-navigation";

export interface ServerErrorViewProps {
  error?: Error | any;
  reset?: () => void;
  customTitle?: string;
  customMessage?: string;
}

export function ServerErrorView({
  error,
  reset,
  customTitle = "Oops, something went wrong",
  customMessage,
}: ServerErrorViewProps) {
  const { data: profile } = useCurrentProfile();
  const dashboardUrl = resolveDefaultRoute(profile?.roles || []);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const defaultDescription = (
    <>
      Server Error 500. We apologise and are fixing the <br className="hidden sm:inline" /> problem. Please try again at a later stage
    </>
  );

  const errorString = error
    ? (error.name || "Error") + ": " + (error.message || String(error)) + (error.stack ? "\n\nStack Trace:\n" + error.stack : "")
    : "";

  function handleCopy() {
    try {
      navigator.clipboard.writeText(errorString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="main-wrapper bg-linear-gradiant min-vh-100 d-flex align-items-center">
      <div className="container">
        <div>
          <div className="row justify-content-center align-items-center">
            <div className="col-md-8 d-flex justify-content-center align-items-center mx-auto">
              <div>
                <div className="p-4 text-center">
                  <a href={dashboardUrl}>
                    <img
                      src="/logo.webp"
                      alt="logo"
                      className="img-fluid"
                      style={{ maxHeight: "48px" }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </a>
                </div>
                <div className="error-images mb-4 text-center">
                  <img
                    src="/assets/img/bg/error-500.svg"
                    alt="image"
                    className="img-fluid"
                  />
                </div>
                <div className="text-center">
                  <h1 className="mb-3">{customTitle}</h1>
                  <p className="fs-16 text-center">
                    {customMessage ? (
                      customMessage
                    ) : (
                      <>
                        Server Error 500. We apologise and are fixing the <br /> problem. Please try again at a later stage
                      </>
                    )}
                  </p>
                  <div className="d-flex justify-content-center pb-4 gap-2">
                    <a
                      href={dashboardUrl}
                      className="btn btn-primary d-flex align-items-center"
                    >
                      <i className="ti ti-arrow-left me-2"></i>Back to Dashboard
                    </a>
                    {reset && (
                      <button
                        type="button"
                        onClick={reset}
                        className="btn btn-outline-secondary d-flex align-items-center"
                      >
                        <i className="ti ti-refresh me-2"></i>Retry Action
                      </button>
                    )}
                  </div>

                  {errorString && (
                    <div className="mt-4 pt-3 border-top max-w-lg mx-auto text-start">
                      <button
                        type="button"
                        onClick={() => setShowDetails(!showDetails)}
                        className="btn btn-sm btn-link text-muted d-flex align-items-center gap-1 mx-auto text-decoration-none"
                      >
                        <i className={`ti ${showDetails ? "ti-chevron-up" : "ti-chevron-down"}`}></i>
                        {showDetails ? "Hide technical diagnostic" : "Show technical diagnostic"}
                      </button>

                      {showDetails && (
                        <div className="mt-3 p-3 bg-dark text-white rounded position-relative">
                          <button
                            type="button"
                            onClick={handleCopy}
                            className="btn btn-sm btn-secondary position-absolute top-0 end-0 m-2 fs-10"
                          >
                            <i className={`ti ${copied ? "ti-check" : "ti-copy"} me-1`}></i>
                            {copied ? "Copied" : "Copy"}
                          </button>
                          <pre className="text-white mb-0 fs-12 text-wrap">
                            {errorString}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
