import type { ReactNode } from 'react';
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  Tooltip,
  TooltipTrigger,
} from 'react-aria-components';
import { joinClasses } from '../joinClasses';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';

export type ButtonProps = Omit<AriaButtonProps, 'className'> & {
  variant?: ButtonVariant;
  isLarge?: boolean;
  className?: string;
};

export function Button({
  variant = 'secondary',
  isLarge = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={joinClasses(
        'pv-button',
        `pv-button--${variant}`,
        variant === 'primary' && 'pv-cut',
        isLarge && 'pv-button--large',
        className,
      )}
    />
  );
}

export type IconButtonProps = Omit<ButtonProps, 'variant' | 'children' | 'aria-label'> & {
  label: string;
  tooltip?: string;
  children: ReactNode;
};

export function IconButton({ label, tooltip, children, ...props }: IconButtonProps) {
  return (
    <TooltipTrigger delay={400} closeDelay={80}>
      <Button {...props} variant="icon" aria-label={label}>
        {children}
      </Button>
      <Tooltip className="pv-tooltip" offset={8}>
        {tooltip ?? label}
      </Tooltip>
    </TooltipTrigger>
  );
}

export type HintProps = {
  text: string;
  children: ReactNode;
};

export function Hint({ text, children }: HintProps) {
  return (
    <TooltipTrigger delay={400} closeDelay={80}>
      {children}
      <Tooltip className="pv-tooltip" offset={8}>
        {text}
      </Tooltip>
    </TooltipTrigger>
  );
}
