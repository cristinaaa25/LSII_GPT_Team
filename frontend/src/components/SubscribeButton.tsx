import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { userService } from '../services/userService';
import { SubscriptionStatus } from '../types/user';
import Icon from './Icon';

interface Props {
  /** Username of the channel. */
  channel: string;
  /** Whether the current user is already subscribed (from the backend). */
  subscribed: boolean;
  /** Receives the backend response so the caller can update its count and state. */
  onChange: (status: SubscriptionStatus) => void;
  size?: 'sm';
}

/**
 * Subscribe/Subscribed toggle for a channel. Anonymous visitors get a link to /login that returns here afterwards;
 * nothing is shown on your own channel.
 */
export const SubscribeButton: React.FC<Props> = ({ channel, subscribed, onChange, size }) => {
  const currentUser = useContext(AuthContext)?.user ?? null;
  const location = useLocation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [channel]);

  const sizeClass = size === 'sm' ? ' btn-sm' : '';

  if (!currentUser) {
    return (
      <Link to="/login" state={{ from: location }} className={`btn btn-primary${sizeClass}`}>
        Subscribe
      </Link>
    );
  }

  if (currentUser.username === channel) {
    return null;
  }

  const handleClick = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      onChange(subscribed ? await userService.unsubscribe(channel) : await userService.subscribe(channel));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subscription');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="d-inline-flex flex-column align-items-center">
      <button
        type="button"
        className={`btn${sizeClass} ${subscribed ? 'btn-soft' : 'btn-primary'}`}
        aria-pressed={subscribed}
        onClick={() => void handleClick()}
        disabled={saving}
      >
        {subscribed && !saving && <Icon name="check" />}
        {saving ? 'Saving...' : subscribed ? 'Subscribed' : 'Subscribe'}
      </button>
      {error && (
        <div className="alert alert-danger py-1 px-2 small mt-2 mb-0" role="alert">
          Could not update the subscription: {error}
        </div>
      )}
    </div>
  );
};

export default SubscribeButton;
