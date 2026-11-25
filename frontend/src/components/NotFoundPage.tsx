import React from 'react';
import { Link } from 'react-router-dom';

interface Props {
  title?: string;
  message?: string;
  linkText?: string;
}

export const NotFoundPage: React.FC<Props> = ({
  title = 'Page Not Found',
  message = 'The page you are looking for does not exist or may have been moved.',
  linkText = 'Back to home',
}) => {
  return (
    <div className="alert alert-warning my-4 text-center not-found-page" role="alert">
      <h2 className="h4 alert-heading">{title}</h2>
      <p className="mb-3">{message}</p>
      <Link to="/" className="btn btn-primary">
        {linkText}
      </Link>
    </div>
  );
};

export default NotFoundPage;
