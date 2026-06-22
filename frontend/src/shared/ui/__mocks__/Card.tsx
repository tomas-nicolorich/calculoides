import React from "react";

export const Card = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) => (
  <div data-testid="card-container">
    <h2>{title}</h2>
    {children}
  </div>
);
