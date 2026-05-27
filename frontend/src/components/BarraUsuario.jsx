import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useContextoAplicacion } from '../context/ContextoAplicacion';

const BarraUsuario = () => {
  const { usuario } = useContextoAplicacion();

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.contenedorUsuario}>
        <Text style={estilos.nombreUsuario}>{usuario}</Text>
      </View>
    </View>
  );
};

const estilos = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  contenedorUsuario: {
    flex: 1,
    alignItems: 'center',
  },
  nombreUsuario: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
});

export default BarraUsuario;
