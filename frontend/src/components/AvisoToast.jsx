import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DURACION_VISIBLE = 2600;
const DESPLAZAMIENTO_OCULTO = Dimensions.get('window').width; // entra desde el borde derecho

const AvisoToast = ({ aviso, onOcultar }) => {
  const opacidad = useRef(new Animated.Value(0)).current;
  const desplazamientoX = useRef(new Animated.Value(DESPLAZAMIENTO_OCULTO)).current;

  useEffect(() => {
    if (!aviso) {
      return undefined;
    }

    opacidad.setValue(0);
    desplazamientoX.setValue(DESPLAZAMIENTO_OCULTO);

    // Entra deslizándose desde la derecha
    Animated.parallel([
      Animated.timing(opacidad, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(desplazamientoX, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
    ]).start();

    const temporizador = setTimeout(() => {
      // Sale deslizándose hacia la derecha
      Animated.parallel([
        Animated.timing(opacidad, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(desplazamientoX, {
          toValue: DESPLAZAMIENTO_OCULTO,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => onOcultar && onOcultar());
    }, DURACION_VISIBLE);

    return () => clearTimeout(temporizador);
    // Se reanima cada vez que cambia el id del aviso
  }, [aviso?.id]);

  if (!aviso) {
    return null;
  }

  const esSalida = aviso.tipo === 'salida';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        estilos.contenedor,
        { opacity: opacidad, transform: [{ translateX: desplazamientoX }] },
      ]}
    >
      <View style={[estilos.tarjeta, esSalida ? estilos.tarjetaSalida : estilos.tarjetaEntrada]}>
        <Ionicons
          name={esSalida ? 'exit-outline' : 'person-add'}
          size={18}
          color="#FFFFFF"
        />
        <Text style={estilos.texto} numberOfLines={2}>
          {aviso.mensaje}
        </Text>
      </View>
    </Animated.View>
  );
};

const estilos = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    // Debajo de la barra superior y del área de la Isla Dinámica; pegado a la derecha.
    top: 64,
    right: 12,
    maxWidth: '82%',
    zIndex: 1000,
    elevation: 1000,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  tarjetaEntrada: {
    backgroundColor: '#34C759',
  },
  tarjetaSalida: {
    backgroundColor: '#8E8E93',
  },
  texto: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});

export default AvisoToast;
