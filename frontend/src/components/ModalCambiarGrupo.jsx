import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { obtenerColorGrupo } from '../utils/validaciones';

const GRUPOS = [
  { id: 'grupo-a', nombre: 'Grupo A' },
  { id: 'grupo-b', nombre: 'Grupo B' },
  { id: 'grupo-c', nombre: 'Grupo C' },
  { id: 'grupo-d', nombre: 'Grupo D' },
];

const ModalCambiarGrupo = ({ visible, grupoActual, cambiando, onSeleccionar, onCerrar }) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <View style={estilos.fondo}>
        <View style={estilos.contenedor}>
          <Text style={estilos.titulo}>Cambiar de grupo</Text>
          <Text style={estilos.subtitulo}>
            Conservas tu nombre. Te moverás al grupo que elijas.
          </Text>

          {GRUPOS.map((grupo) => {
            const esActual = grupo.id === grupoActual;
            const color = obtenerColorGrupo(grupo.id);
            return (
              <TouchableOpacity
                key={grupo.id}
                style={[
                  estilos.item,
                  { borderColor: color },
                  esActual && estilos.itemActual,
                ]}
                disabled={esActual || cambiando}
                onPress={() => onSeleccionar(grupo)}
              >
                <View style={[estilos.punto, { backgroundColor: color }]} />
                <Text style={estilos.nombreGrupo}>
                  {grupo.nombre}
                  {esActual ? ' (actual)' : ''}
                </Text>
                {!esActual && (
                  <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                )}
              </TouchableOpacity>
            );
          })}

          {cambiando && (
            <ActivityIndicator color="#007AFF" style={{ marginTop: 12 }} />
          )}

          <TouchableOpacity
            style={estilos.botonCancelar}
            onPress={onCerrar}
            disabled={cambiando}
          >
            <Text style={estilos.textoCancelar}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  contenedor: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  itemActual: {
    opacity: 0.45,
    backgroundColor: '#F2F2F7',
  },
  punto: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  nombreGrupo: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  botonCancelar: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  textoCancelar: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '600',
  },
});

export default ModalCambiarGrupo;
