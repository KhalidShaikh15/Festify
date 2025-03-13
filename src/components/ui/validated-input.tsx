
import React from 'react';
import { Input } from './input';

interface ValidatedInputProps extends React.ComponentProps<typeof Input> {
  error?: string;
  label?: string;
}

const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ className, error, label, id, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={id} className="text-sm font-medium">{label}</label>
        )}
        <Input
          id={id}
          className={error ? "border-red-500" : className}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";

export { ValidatedInput };
