// UI Components Central Export Index
// This file provides a single entry point for all UI components
// to ensure consistent module resolution across different build environments

// Card Components
export { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './Card'
export type { CardProps } from './Card'

// Button Component  
export { Button, default as ButtonDefault } from './Button'
export type { ButtonProps } from './Button'

// Input Component
export { Input, default as InputDefault } from './Input'
export type { InputProps } from './Input'

// Badge Component
export { Badge } from './badge'

// Label Component
export { Label } from './label'

// Select Component
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

// Tabs Components
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

// Textarea Component
export { Textarea } from './textarea'

// Re-export individual components as default exports for compatibility
import ButtonComponent from './Button'
import InputComponent from './Input'

export const UIButton = ButtonComponent
export const UIInput = InputComponent