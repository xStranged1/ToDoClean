import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Text } from "react-native"

interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
    onCancel?: () => void
}

export default function CustomAlert({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Confirmar",
    cancelLabel = "Cancelar",
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange} className="px-2">
            <AlertDialogContent className="max-w-xs">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl flex items-center gap-2">
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-base">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-row items-center justify-end gap-2">
                    <AlertDialogAction
                        className="bg-secondary"
                        onPress={() => {
                            onOpenChange(false)
                            onCancel?.()
                        }}
                    >
                        <Text className="text-foreground">{cancelLabel}</Text>
                    </AlertDialogAction>
                    <AlertDialogAction
                        className="bg-destructive"
                        onPress={() => {
                            onOpenChange(false)
                            onConfirm()
                        }}
                    >
                        <Text className="text-foreground">{confirmLabel}</Text>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
