import React from "react";
import { useCurrentProfile } from "@/lib/session";
import { resolveDefaultRoute } from "@/lib/auth-navigation";

export interface NotFoundViewProps {
  customTitle?: string;
  customMessage?: string;
}

export function NotFoundView({
  customTitle = "Oops, something went wrong",
  customMessage,
}: NotFoundViewProps) {
  const { data: profile } = useCurrentProfile();
  const dashboardUrl = resolveDefaultRoute(profile?.roles || []);

  const defaultDescription = (
    <>
      Error 404 Page not found. Sorry the page you looking <br className="hidden sm:inline" /> for doesn’t exist or has been moved
    </>
  );

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
                <div className="error-images mb-5 text-center">
                  <img
                    src="/assets/img/bg/error-404.svg"
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
                        Error 404 Page not found. Sorry the page you looking <br /> for doesn’t exist or has been moved
                      </>
                    )}
                  </p>
                  <div className="d-flex justify-content-center pb-4">
                    <a
                      href={dashboardUrl}
                      className="btn btn-primary d-flex align-items-center"
                    >
                      <i className="ti ti-arrow-left me-2"></i>Back to Dashboard
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
