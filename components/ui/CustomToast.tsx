import { View, Text, useColorScheme } from 'react-native';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react-native';

export const CustomToast = ({ toast }: { toast: any }) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const isError = toast.type === 'error';
    const isSuccess = toast.type === 'success';
    const isWarning = toast.type === 'warning';

    // Configuración de colores y estilos según el tipo
    const getToastConfig = () => {
        if (isError) {
            return {
                icon: XCircle,
                iconColor: isDark ? '#f87171' : '#dc2626',
                bgColor: isDark ? 'rgba(220, 38, 38, 0.15)' : 'rgba(254, 226, 226, 1)',
                borderColor: isDark ? 'rgba(220, 38, 38, 0.4)' : 'rgba(220, 38, 38, 0.3)',
                titleColor: isDark ? '#fca5a5' : '#dc2626',
                textColor: isDark ? '#fecaca' : '#991b1b',
            };
        }

        if (isSuccess) {
            return {
                icon: CheckCircle2,
                iconColor: isDark ? '#4ade80' : '#16a34a',
                bgColor: isDark ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 252, 231, 1)',
                borderColor: isDark ? 'rgba(22, 163, 74, 0.4)' : 'rgba(22, 163, 74, 0.3)',
                titleColor: isDark ? '#86efac' : '#16a34a',
                textColor: isDark ? '#bbf7d0' : '#15803d',
            };
        }

        if (isWarning) {
            return {
                icon: AlertCircle,
                iconColor: isDark ? '#fbbf24' : '#d97706',
                bgColor: isDark ? 'rgba(217, 119, 6, 0.15)' : 'rgba(254, 243, 199, 1)',
                borderColor: isDark ? 'rgba(217, 119, 6, 0.4)' : 'rgba(217, 119, 6, 0.3)',
                titleColor: isDark ? '#fcd34d' : '#d97706',
                textColor: isDark ? '#fde68a' : '#b45309',
            };
        }

        // Info por defecto
        return {
            icon: Info,
            iconColor: isDark ? '#60a5fa' : '#2563eb',
            bgColor: isDark ? 'rgba(37, 99, 235, 0.15)' : 'rgba(219, 234, 254, 1)',
            borderColor: isDark ? 'rgba(37, 99, 235, 0.4)' : 'rgba(37, 99, 235, 0.3)',
            titleColor: isDark ? '#93c5fd' : '#2563eb',
            textColor: isDark ? '#bfdbfe' : '#1e40af',
        };
    };

    const config = getToastConfig();
    const Icon = config.icon;

    return (
        <View
            className="mx-4 mt-2 mb-1 rounded-xl shadow-lg w-[90%]"
            style={{
                backgroundColor: config.bgColor,
                borderColor: config.borderColor,
                borderWidth: 1.5,
                shadowColor: isDark ? '#000' : config.borderColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.15,
                shadowRadius: 8,
                elevation: 8,
            }}
        >
            <View className="flex-row items-start p-4">
                {/* Icono */}
                <View className="mr-3 mt-0.5">
                    <Icon
                        size={22}
                        color={config.iconColor}
                        strokeWidth={2.5}
                    />
                </View>

                {/* Contenido */}
                <View className="flex-1">
                    <Text
                        className="font-semibold text-base mb-1"
                        style={{
                            color: config.titleColor,
                            letterSpacing: 0.2,
                        }}
                    >
                        {toast.message?.title ?? toast.message}
                    </Text>

                    {toast.message?.text && (
                        <Text
                            className="text-sm leading-5"
                            style={{
                                color: config.textColor,
                                opacity: 0.9,
                            }}
                        >
                            {toast.message.text}
                        </Text>
                    )}
                </View>
            </View>
        </View>
    );
};